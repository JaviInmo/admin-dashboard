import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <Toaster 
        richColors 
        position="top-right" 
        closeButton 
        expand={true}
        visibleToasts={4}
        duration={4000}
        toastOptions={{
          style: {
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '14px',
            padding: '16px',
            minHeight: '60px',
          },
          className: 'modern-toast',
        }}
      />
    </>
  );
}
