'use client'

import { useEffect, useState } from 'react'
import { getUserDateSetsAction } from '@/app/actions/date-sets'
import { DateSet } from '@/lib/date-sets'
import { DateSetCard } from '@/components/date-set-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export default function MyDatesPage() {
  const [dateSets, setDateSets] = useState<DateSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDateSets() {
      try {
        const result = await getUserDateSetsAction()
        if (result.success && result.dateSets) {
          setDateSets(result.dateSets)
        } else {
          setError(result.error || 'Failed to load date sets')
        }
      } catch (err) {
        setError('An unexpected error occurred')
        console.error('Error loading date sets:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDateSets()
  }, [])

  const handleDateSetUpdate = (updatedDateSet: DateSet) => {
    setDateSets(dateSets.map(ds => 
      ds.id === updatedDateSet.id ? updatedDateSet : ds
    ))
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-6">My Date Sets</h1>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-6">My Date Sets</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Date Sets</h1>
          <Link href="/">
            <Button variant="outline">Create New Date Set</Button>
          </Link>
        </div>

        {dateSets.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No date sets yet</h2>
            <p className="text-gray-600 mb-4">Create your first date set to get started!</p>
            <Link href="/">
              <Button>Create Date Set</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dateSets.map((dateSet) => (
              <DateSetCard 
                key={dateSet.id} 
                dateSet={dateSet} 
                onUpdate={handleDateSetUpdate}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
} 