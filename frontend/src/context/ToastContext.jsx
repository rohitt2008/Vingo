import React, { createContext, useContext, useState, useCallback } from "react";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

const ToastContext = createContext(null);

const toastStyles = `
@keyframes slideIn {
  from {
    transform: translateY(1.5rem) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
.animate-slide-in {
  animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.animate-toast-progress {
  animation: progress linear forwards;
}
`;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      <style>{toastStyles}</style>
      {children}
      
      {/* Premium Glassmorphic Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bgClass = "bg-white/90 border-gray-200 text-gray-800";
          let icon = <FiInfo className="text-blue-500 text-lg shrink-0" />;
          let progressBg = "bg-blue-500";

          if (toast.type === "success") {
            bgClass = "bg-emerald-50/90 border-emerald-200 text-emerald-900";
            icon = <FiCheckCircle className="text-emerald-500 text-lg shrink-0" />;
            progressBg = "bg-emerald-500";
          } else if (toast.type === "error") {
            bgClass = "bg-rose-50/90 border-rose-200 text-rose-900";
            icon = <FiAlertCircle className="text-rose-500 text-lg shrink-0" />;
            progressBg = "bg-rose-500";
          } else if (toast.type === "warning") {
            bgClass = "bg-amber-50/90 border-amber-200 text-amber-900";
            icon = <FiAlertCircle className="text-amber-500 text-lg shrink-0 animate-pulse" />;
            progressBg = "bg-amber-500";
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 opacity-100 animate-slide-in relative overflow-hidden ${bgClass}`}
            >
              {icon}
              <div className="flex-1 text-xs font-extrabold leading-snug">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 cursor-pointer"
              >
                <FiX className="text-sm" />
              </button>

              {/* Progress bar countdown loader */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100/35">
                <div
                  className={`h-full animate-toast-progress ${progressBg}`}
                  style={{ animationDuration: "4000ms" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
