import { Heart, Sparkles } from "lucide-react";

function Footer() {
  return (
    <footer className="mt-16 border-t border-purple-100 bg-white/60 px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 text-center">
        <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-gray-600">
          Made with <Heart size={14} className="fill-pink-400 text-pink-400" />{" "}
          love, trust issues, and a lot of pink.
        </p>

        <p className="flex flex-wrap items-center justify-center gap-1 text-xs text-gray-400">
          <Sparkles size={12} className="text-purple-400" />
          PetalPDF · I don’t trust PDF websites, so I built my own.
          <Sparkles size={12} className="text-purple-400" />
        </p>

        <p className="text-xs text-gray-400">
          Your files stay in your browser. Nosy servers not invited.
        </p>
      </div>
    </footer>
  );
}

export default Footer;