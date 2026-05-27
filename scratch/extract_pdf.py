import pypdf
import sys

def extract_pdf_text(pdf_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        for i, page in enumerate(reader.pages):
            print(f"--- PAGE {i+1} ---")
            print(page.extract_text())
    except Exception as e:
        print(f"Error reading PDF: {e}", file=sys.stderr)

if __name__ == "__main__":
    extract_pdf_text("/Users/rohit/Desktop/vingo/Vingo_Flow_Guide.pdf")
