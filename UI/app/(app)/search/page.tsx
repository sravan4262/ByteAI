import { Suspense } from 'react'
import { SearchScreen } from '@/components/features/search/search-screen'

export default function SearchPage() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  )
}
