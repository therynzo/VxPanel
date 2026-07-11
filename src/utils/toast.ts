export const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vx-toast", { detail: { message, type } }));
  }
};
