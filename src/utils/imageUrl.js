const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5050/api").replace("/api", "");

export const resolveImageUrl = (url, fallback = "") => {
  if (!url) return fallback;
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `${API_BASE_URL}/${url.replace(/^\//, "")}`;
};

export const optimizeImageUrl = (url, options = {}) => {
  const {
    width,
    height,
    quality = 70,
    fit = "crop",
    fallback = "",
  } = options;
  const resolvedUrl = resolveImageUrl(url, fallback);

  if (!resolvedUrl || resolvedUrl.startsWith("data:") || resolvedUrl.startsWith("blob:")) {
    return resolvedUrl;
  }

  try {
    const parsed = new URL(resolvedUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "images.unsplash.com") {
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", fit);
      parsed.searchParams.set("q", String(quality));
      if (width) parsed.searchParams.set("w", String(width));
      if (height) parsed.searchParams.set("h", String(height));
      return parsed.toString();
    }

    if (host === "res.cloudinary.com" && parsed.pathname.includes("/image/upload/")) {
      const transforms = [
        "f_auto",
        "q_auto:eco",
        fit === "crop" ? "c_fill" : "c_limit",
        width ? `w_${width}` : null,
        height ? `h_${height}` : null,
        fit === "crop" ? "g_auto" : null,
      ].filter(Boolean).join(",");

      parsed.pathname = parsed.pathname.replace("/image/upload/", `/image/upload/${transforms}/`);
      return parsed.toString();
    }

    return resolvedUrl;
  } catch {
    return resolvedUrl;
  }
};
