import { normalizePhoneE164, waLink } from "@/utils/whatsapp";

type Props = {
  phone?: string | null;
  country?: "MX" | "CO" | "VE";
  message: string;
  className?: string;
};

export default function WhatsappButton({ phone, country = "MX", message, className }: Props) {
  const e164 = phone ? normalizePhoneE164(phone, country) : null;
  const href = e164 ? waLink(e164, message) : undefined;
  const disabled = !e164;

  return (
    <a
      href={disabled ? undefined : href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={disabled}
      title={disabled ? "Sin número registrado" : "Enviar WhatsApp"}
      className={[
        "btn-neo flex items-center justify-center gap-2",
        disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : "",
        className || ""
      ].join(" ")}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.52 3.48A11.92 11.92 0 0 0 12.06 0C5.46 0 .06 5.4.06 12.06c0 2.13.57 4.2 1.65 6.02L0 24l6.1-1.6a12.03 12.03 0 0 0 5.96 1.57h.01c6.6 0 12-5.4 12-12 0-3.2-1.25-6.22-3.55-8.49ZM12.06 21.6c-1.92 0-3.8-.52-5.43-1.5l-.39-.23-3.62.95.97-3.53-.25-.36a9.57 9.57 0 0 1-1.5-5.47c0-5.28 4.3-9.58 9.6-9.58 2.56 0 4.97 1 6.77 2.8 1.8 1.79 2.81 4.2 2.81 6.76 0 5.28-4.3 9.58-9.56 9.58Zm5.47-7.16c-.3-.15-1.78-.88-2.06-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.66.07-.3-.15-1.26-.47-2.4-1.5-.88-.77-1.48-1.72-1.65-2.02-.17-.3-.02-.47.13-.62.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.66-.5l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.25 5.16 4.55.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.72 2.03-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/>
      </svg>
      WhatsApp
    </a>
  );
}
