
import {
  Combine,
  Scissors,
  FilePenLine,
  PenTool,
  Image,
  Files,
} from 'lucide-react'

export const tools = [
  {
    title: 'Merge PDF',
    description: 'Combine multiple PDFs into one file.',
    icon: Combine,
    category: 'Organize',
    path: '/merge-pdf',
  },
  {
    title: 'Split PDF',
    description: 'Extract pages into separate files.',
    icon: Scissors,
    category: 'Organize',
    path: '/split-pdf',

  },
  {
    title: 'Fill & Edit or Sign PDF',
    description: 'Add text, dates and checkboxes.',
    icon: FilePenLine,
    category: 'Edit',
    path: '/fill-edit-pdf',
  },
  {
    title: 'Image to PDF',
    description: 'Convert images into a PDF.',
    icon: Image,
    category: 'Convert',
    path: '/image-to-pdf',
  },
  {
    title: 'Organize Pages',
    description: 'Reorder, rotate and remove pages.',
    icon: Files,
    category: 'Organize',
    path: '/organize-pdf',
  },
]
