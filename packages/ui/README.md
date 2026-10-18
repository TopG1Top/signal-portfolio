# UI package boundary

The current application owns its reusable shadcn-style Button in `apps/web/components/ui/button.tsx`, using Radix Slot and class-variance-authority. Shared primitives can be moved here when a second application needs them. The rest of the UI uses native accessible controls and custom CSS/Tailwind.
