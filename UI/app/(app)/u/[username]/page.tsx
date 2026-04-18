import { PublicProfileScreen } from '@/components/features/profile/public-profile-screen'


interface Props {
  params: Promise<{ username: string }>
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params
  return <PublicProfileScreen username={username} />
}
