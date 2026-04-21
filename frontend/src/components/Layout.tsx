import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, LogOut } from 'lucide-react'
import { useStore } from '../lib/store'

export default function Layout() {
  const { user, logout } = useStore()
  const navigate = useNavigate()
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="font-bold text-lg">IRSS</h1>
              <p className="text-xs text-gray-500">Resume Screening</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          <a href="/jobs" className="block px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            Jobs
          </a>
          <a href="/candidates" className="block px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            Candidates
          </a>
          <a href="/analytics" className="block px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            Analytics
          </a>
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 w-64 border-t p-4">
          <div className="text-sm mb-3">
            <p className="text-gray-600">Logged in as</p>
            <p className="font-semibold">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
