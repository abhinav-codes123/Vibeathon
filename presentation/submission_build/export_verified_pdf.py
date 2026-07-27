from pathlib import Path

from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path("/Users/mac/Desktop/Codex_Projects/Vibeathon")
SLIDES = ROOT / "presentation/submission_build/final-inspect/source-slides"
OUTPUT = ROOT / "presentation/FlowDine_AI_Vibeathon_Official_Submission.pdf"
PAGE_SIZE = (960, 540)


def main() -> None:
    slide_paths = [
        SLIDES / f"source-slide-{index:02d}.png" for index in range(1, 7)
    ]
    missing = [str(path) for path in slide_paths if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing verified slide renders: {missing}")

    pdf = canvas.Canvas(str(OUTPUT), pagesize=PAGE_SIZE, pageCompression=1)
    for slide_path in slide_paths:
        pdf.setPageSize(PAGE_SIZE)
        pdf.drawImage(
            ImageReader(str(slide_path)),
            0,
            0,
            width=PAGE_SIZE[0],
            height=PAGE_SIZE[1],
            preserveAspectRatio=True,
            anchor="c",
            mask="auto",
        )
        pdf.showPage()
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()

