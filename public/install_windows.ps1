# Create the virtual environment.
python -m venv .venv

# Allow activation in this PowerShell session only.
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

# Activate the environment.
.\.venv\Scripts\Activate.ps1

# Upgrade pip.
python -m pip install -U pip

# Install PaddlePaddle CPU.
python -m pip install paddlepaddle==3.2.1 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/

# Install converter dependencies.
python -m pip install -r requirements.txt

# Optional: download and initialize OCR models now.
python smart_pdf_to_docx.py --prepare-ocr
