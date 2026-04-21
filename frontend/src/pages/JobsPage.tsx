import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { Plus, Search } from 'lucide-react'

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await api.get('/api/v1/jobs')
      return response.data
    },
  })
  
  const filteredJobs = jobs?.filter((job: any) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>
      
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      
      {isLoading && <p>Loading jobs...</p>}
      {error && <p className="text-red-600">Error loading jobs</p>}
      
      <div className="grid gap-4">
        {filteredJobs.map((job: any) => (
          <div key={job.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
            <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
            <p className="text-gray-600 mb-4 line-clamp-2">{job.jd_text}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Created: {new Date(job.created_at).toLocaleDateString()}
              </span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                {job.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {filteredJobs.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No jobs found</p>
        </div>
      )}
    </div>
  )
}
