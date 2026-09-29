import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function StatusMessage({ message, messageType }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`
        mt-6
        rounded-xl
        border
        p-4
        flex
        items-center
        gap-3
        ${
          messageType === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }
      `}
    >
      {messageType === "success" ? (
        <CheckCircle2 size={20} />
      ) : (
        <AlertCircle size={20} />
      )}

      <span className="text-sm">{message}</span>
    </div>
  );
}
