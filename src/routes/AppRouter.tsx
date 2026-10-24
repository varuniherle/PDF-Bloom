
import { BrowserRouter, Routes, Route } from 'react-router'
import Home from '../pages/Home'
import MergePdf from '../features/merge-pdf/MergePdf'
import SplitPdf from '../features/split-pdf/SplitPdf'
import FillEditPdf from '../features/fill-edit-pdf/FillEditPdf'
import ImageToPdf from "../features/image-to-pdf/ImageToPdf";
import OrganizePdf from "../features/organize-pdf/OrganizePdf";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/merge-pdf" element={<MergePdf />} />
        <Route path="/split-pdf" element={<SplitPdf />} />
        <Route path="/fill-edit-pdf" element={<FillEditPdf />} />
        <Route path="/image-to-pdf" element={<ImageToPdf />} />
        <Route path="/organize-pdf" element={<OrganizePdf />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
