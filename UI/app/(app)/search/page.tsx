import { Suspense } from 'react'
import { SearchScreen } from '@/components/features/search/search-screen'

export const dynamic = 'force-dynamic'

export default function SearchPage() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  )
}
