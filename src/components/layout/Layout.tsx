import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import ToastContainer from '../ui/Toast'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-h-dvh">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pt-16 md:pt-8">
          {children}
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}
