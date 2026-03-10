export const showAlert = (message) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("ui:alert", {
      detail: { message: String(message || "") },
    })
  );
};

export const showConfirm = (message) => {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("ui:confirm", {
        detail: { message: String(message || ""), resolve },
      })
    );
  });
};
