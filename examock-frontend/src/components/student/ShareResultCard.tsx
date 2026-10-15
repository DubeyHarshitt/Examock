// src/components/student/ShareResultCard.tsx
//
// Ticket 20: one-tap share of a result. Uses the Web Share API with the
// generated image when the platform supports files (mobile WhatsApp/Telegram/
// Instagram), and falls back to a small chooser (download / WhatsApp / Telegram
// / copy link) on desktop.

import { useEffect, useState } from "react";
import { Share2, Download, Link2, MessageCircle, Send } from "lucide-react";

import { Button, Modal } from "../ui";
import { useToast } from "../ui/toast/toast-context";
import { track } from "../../utils/analytics";
import {
  renderShareCard,
  shareUrl,
  shareCardFileName,
  downloadBlob,
  whatsappShareUrl,
  telegramShareUrl,
  type ShareCardData,
} from "../../utils/shareCard";

interface Props {
  attemptId?: string;
  data: ShareCardData;
}

export default function ShareResultCard({ attemptId, data }: Props) {
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const url = shareUrl(attemptId);
  const text = `I scored ${Math.round(data.score)}/${data.totalMarks} on Examock! 💪`;

  // Revoke the preview object URL when it changes or on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const image = await renderShareCard(data);
      const file = new File([image], shareCardFileName(), { type: "image/png" });

      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      track("share", {
        surface: "result",
        channel: canShareFiles ? "native_image" : "native",
      });

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(
          canShareFiles
            ? { files: [file], title: "My Examock result", text, url }
            : { title: "My Examock result", text, url },
        );
        success("Shared!");
        return;
      }

      // No Web Share API (most desktops) → show the chooser.
      setBlob(image);
      setPreviewUrl(URL.createObjectURL(image));
      setFallbackOpen(true);
    } catch (err) {
      // AbortError = the user dismissed the native share sheet. Not an error.
      if ((err as DOMException)?.name !== "AbortError") {
        console.error("Share failed:", err);
        error("Couldn't create the share card. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onChannel = (kind: "whatsapp" | "telegram" | "download" | "copy") => {
    track("share", { surface: "result", channel: kind });
    if (kind === "download" && blob) {
      downloadBlob(blob, shareCardFileName());
      success("Image downloaded");
    } else if (kind === "whatsapp") {
      window.open(whatsappShareUrl(text, url), "_blank", "noopener,noreferrer");
    } else if (kind === "telegram") {
      window.open(telegramShareUrl(text, url), "_blank", "noopener,noreferrer");
    } else if (kind === "copy") {
      navigator.clipboard
        ?.writeText(url)
        .then(() => success("Link copied"))
        .catch(() => error("Couldn't copy the link"));
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        icon={<Share2 className="w-4 h-4" />}
        loading={busy}
        onClick={onShare}
      >
        Share your result
      </Button>

      <Modal
        open={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        title="Share your result"
        description="Send your score card and a link back to Examock."
      >
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Your Examock result card"
            className="mx-auto mb-4 w-full max-w-xs rounded-xl border border-slate-100"
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            icon={<MessageCircle className="w-4 h-4 text-emerald-600" />}
            onClick={() => onChannel("whatsapp")}
          >
            WhatsApp
          </Button>
          <Button
            variant="outline"
            icon={<Send className="w-4 h-4 text-sky-600" />}
            onClick={() => onChannel("telegram")}
          >
            Telegram
          </Button>
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={() => onChannel("download")}
          >
            Save image
          </Button>
          <Button
            variant="outline"
            icon={<Link2 className="w-4 h-4" />}
            onClick={() => onChannel("copy")}
          >
            Copy link
          </Button>
        </div>
      </Modal>
    </>
  );
}
