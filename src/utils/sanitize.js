// Strip HTML/script content from user input.
// Note: React's JSX already escapes values, so this is defense-in-depth
// for any future use in non-React contexts (e.g., CSV export, backup files).
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')               // Strip all HTML tags
    .replace(/javascript\s*:/gi, '')       // Remove javascript: protocol (with optional whitespace)
    .replace(/data\s*:/gi, '')             // Remove data: protocol
    .replace(/vbscript\s*:/gi, '')         // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '')            // Remove event handlers (onclick=, etc.)
    .trim()
    .slice(0, 1000);                       // Hard cap at 1000 chars
}
