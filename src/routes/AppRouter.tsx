
import { BrowserRouter, Routes, Route } from "react-router";
import Home from "../pages/Home";
import MergePdf from "../features/merge-pdf/MergePdf";
import SplitPdf from "../features/split-pdf/SplitPdf";
import FillEditPdf from "../features/fill-edit-pdf/FillEditPdf";
import ImageToPdf from "../features/image-to-pdf/ImageToPdf";
import OrganizePdf from "../features/organize-pdf/OrganizePdf";
import SEO from "../components/SEO";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <SEO
                title="PDF Bloom — Free Online PDF Tools"
                description="Merge PDFs, split pages, organize documents, fill and sign PDFs, and convert images to PDF with PDF Bloom."
                path="/"
              />
              <Home />
            </>
          }
        />

        <Route
          path="/merge-pdf"
          element={
            <>
              <SEO
                title="Merge PDF Files Online Free | PDF Bloom"
                description="Combine multiple PDF files into one document with PDF Bloom's free online PDF merger."
                path="/merge-pdf"
              />
              <MergePdf />
            </>
          }
        />

        <Route
          path="/split-pdf"
          element={
            <>
              <SEO
                title="Split PDF Pages Online Free | PDF Bloom"
                description="Split PDF documents and extract the pages you need with PDF Bloom's free online PDF splitter."
                path="/split-pdf"
              />
              <SplitPdf />
            </>
          }
        />

        <Route
          path="/fill-edit-pdf"
          element={
            <>
              <SEO
                title="Fill and Sign PDF Online | PDF Bloom"
                description="Fill out and sign PDF documents online with PDF Bloom's easy-to-use PDF tool."
                path="/fill-edit-pdf"
              />
              <FillEditPdf />
            </>
          }
        />

        <Route
          path="/image-to-pdf"
          element={
            <>
              <SEO
                title="Convert Images to PDF Online | PDF Bloom"
                description="Convert JPG, PNG, and supported image files into PDF documents with PDF Bloom."
                path="/image-to-pdf"
              />
              <ImageToPdf />
            </>
          }
        />

        <Route
          path="/organize-pdf"
          element={
            <>
              <SEO
                title="Organize PDF Pages Online | PDF Bloom"
                description="Reorder, rotate, and remove PDF pages using PDF Bloom's free online PDF organizer."
                path="/organize-pdf"
              />
              <OrganizePdf />
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
