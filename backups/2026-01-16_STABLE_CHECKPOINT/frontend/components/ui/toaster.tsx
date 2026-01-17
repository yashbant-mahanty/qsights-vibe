"use client"

import { useToast } from "./toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-0 right-0 z-[10000] flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => {
        const variantStyles = {
          default: "bg-white border-gray-200",
          success: "bg-green-50 border-green-200",
          error: "bg-red-50 border-red-200",
          warning: "bg-yellow-50 border-yellow-200",
        }

        const iconStyles = {
          default: "text-gray-600",
          success: "text-green-600",
          error: "text-red-600",
          warning: "text-yellow-600",
        }

        const icons = {
          default: null,
          success: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          error: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          warning: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        }

        return (
          <div
            key={toast.id}
            className={`group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all ${
              variantStyles[toast.variant || "default"]
            } animate-in slide-in-from-top-full sm:slide-in-from-bottom-full`}
          >
            <div className="flex items-start space-x-3">
              {icons[toast.variant || "default"] && (
                <div className={iconStyles[toast.variant || "default"]}>
                  {icons[toast.variant || "default"]}
                </div>
              )}
              <div className="grid gap-1">
                {toast.title && (
                  <div className="text-sm font-semibold text-gray-900">
                    {toast.title}
                  </div>
                )}
                {toast.description && (
                  <div className="text-sm text-gray-600">
                    {toast.description}
                  </div>
                )}
              </div>
            </div>
            {toast.action}
            <button
              onClick={() => toast.onOpenChange?.(false)}
              className="absolute right-2 top-2 rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 focus:opacity-100 focus:outline-none group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
