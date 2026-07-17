import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const initialError =
    error === 'invalid_reset_link'
      ? 'That password reset link was invalid or expired. Request a new one below.'
      : null

  return <LoginForm initialError={initialError} />
}
