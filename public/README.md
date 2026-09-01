Smart PDF -> DOCX for a Long-Running Python Application

This package is based on the original high-quality converter that produced the best DOCX result in testing.
The OCR path still uses PaddleOCR-VL + save_to_word() for scanned/image PDFs.

Files

smart_pdf_to_docx.py — main converter module.

app_integration.py — minimal Python integration example.

requirements.txt — Python dependencies.

install_windows.ps1 — Windows setup commands.

Recommended architecture

Main Python application starts once
        |
        +--> import smart_pdf_to_docx
        |
        +--> create one ConverterConfig
        |
        +--> prepare_ocr(config) once
        |       |
        |       +--> PaddleOCR-VL loads into RAM once
        |
        +--> application keeps running
                |
                +--> digital PDF -> pdf2docx -> fast
                +--> digital PDF -> pdf2docx -> fast
                +--> scanned PDF -> already loaded OCR model
                +--> scanned PDF -> same OCR model in RAM
                +--> ...

Do not launch python smart_pdf_to_docx.py ... as a new subprocess for every PDF in your production application. A new process would reload the large OCR model into RAM every time.

Windows installation

Recommended: 64-bit Python 3.9-3.13.

Create and activate a virtual environment:

python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1

Install PaddlePaddle CPU:

python -m pip install paddlepaddle==3.2.1 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/

Install the remaining dependencies:

python -m pip install -r requirements.txt

First model installation

The first OCR initialization downloads the large PaddleOCR-VL model and support models. This may take a long time once.
After that, the files stay in the Paddle/PaddleX model cache on the computer.

Run once if you want to prepare the OCR stack manually:

python smart_pdf_to_docx.py --prepare-ocr

Important distinction:

Download to disk:
    once per computer/model cache

Load model from disk into RAM:
    once per application process start

Because your main application stays alive, the expensive RAM load happens only once after application startup.

Python integration

from smart_pdf_to_docx import ConverterConfig, prepare_ocr, convert_pdf_to_docx

PDF_CONFIG = ConverterConfig()

# Run once when the main application starts.
prepare_ocr(PDF_CONFIG)

# Call this as many times as required.
docx_path = convert_pdf_to_docx(
    pdf_path,
    config=PDF_CONFIG,
)

The module keeps the initialized OCR pipeline in an in-process cache, so later scanned PDFs reuse the same model.

Digital PDF behavior

Normal PDFs containing real text are routed to pdf2docx and do not require OCR processing for their pages.
A fully digital PDF uses the fast whole-document conversion path.

Digital PDF
    -> fast analysis
    -> pdf2docx
    -> DOCX

Scanned PDF
    -> PaddleOCR-VL
    -> orientation / unwarping / layout
    -> save_to_word()
    -> DOCX

Logging

By default the converter prints concise application-level messages such as:

[INFO] PDF: document.pdf | pages=3 | digital=0 | OCR=3
[INFO] OCR model: loading PaddleOCR-VL (first use in this process)...
[INFO] OCR model: ready in 58.1 s
[INFO] OCR: processing page 1/3
[INFO] OCR: processing page 2/3
[INFO] OCR: processing page 3/3
[INFO] Done: document.docx

Third-party Paddle/PaddleX output is suppressed as much as practical. Diagnostic library logs can still be enabled from the module CLI when needed.

Network/proxy issue

If model download fails because of a local SOCKS proxy such as 127.0.0.1:10808, clear proxy environment variables in the current PowerShell session before downloading models:

Remove-Item Env:HTTP_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:HTTPS_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:ALL_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:http_proxy -ErrorAction SilentlyContinue
Remove-Item Env:https_proxy -ErrorAction SilentlyContinue
Remove-Item Env:all_proxy -ErrorAction SilentlyContinue
Remove-Item Env:PIP_PROXY -ErrorAction SilentlyContinue
$env:NO_PROXY="*"
$env:no_proxy="*"

Then verify:

python -c "import urllib.request; print(urllib.request.getproxies())"

Production rule

For the best combination of quality and throughput:

Start the Python application once.

Create one ConverterConfig.

Load OCR once with prepare_ocr().

Keep the process alive.

Reuse convert_pdf_to_docx() for every PDF.

Do not clear the OCR cache between files.

Do not create a new Python subprocess for every PDF.
