"""Example integration for a long-running Python application.

Important:
- Import the converter module once.
- Keep one ConverterConfig instance for the lifetime of the application.
- Call prepare_ocr() once during application startup if you want the heavy OCR
  model to be ready before the first scanned PDF arrives.
- Never launch a new Python subprocess for every PDF. The OCR pipeline is kept
  in RAM and reused by convert_pdf_to_docx().
"""

from pathlib import Path
from smart_pdf_to_docx import ConverterConfig, prepare_ocr, convert_pdf_to_docx


PDF_CONFIG = ConverterConfig()


def initialize_pdf_converter() -> None:
    """Load PaddleOCR-VL into RAM once when the main application starts."""
    prepare_ocr(PDF_CONFIG)


def convert_one_pdf(pdf_path: str | Path, output_docx: str | Path | None = None) -> Path:
    """Convert one PDF while reusing the already loaded OCR pipeline."""
    return convert_pdf_to_docx(
        pdf_path,
        output_docx,
        config=PDF_CONFIG,
    )


def convert_pdf_queue(pdf_files: list[str | Path], output_dir: str | Path) -> None:
    """Process many PDFs without restarting Python or reloading the OCR model."""
    destination_dir = Path(output_dir)
    destination_dir.mkdir(parents=True, exist_ok=True)

    for pdf_file in pdf_files:
        source = Path(pdf_file)
        destination = destination_dir / f"{source.stem}.docx"

        try:
            result = convert_one_pdf(source, destination)
            print(f"OK: {source.name} -> {result.name}")
        except Exception as error:
            print(f"ERROR: {source.name}: {error}")


if __name__ == "__main__":
    initialize_pdf_converter()

    convert_pdf_queue(
        [
            r"C:\Docs\file1.pdf",
            r"C:\Docs\file2.pdf",
        ],
        r"C:\Docs\Converted",
    )
