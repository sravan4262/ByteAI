export const metadata = {
  title: "Support — ByteAI",
  description: "Help, FAQs, and contact information for ByteAI",
};

export default function SupportPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-base text-gray-800 dark:text-gray-200 leading-relaxed">
      <h1 className="text-3xl font-bold text-black dark:text-white mb-1">SUPPORT</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10">We are here to help.</p>

      <h2 className="text-xl font-bold text-black dark:text-white mb-3">Contact</h2>
      <p className="mb-10">
        For all support questions, account issues, bug reports, and feedback, email us at{" "}
        <a
          href="mailto:officialbyteai@gmail.com?subject=ByteAI%20Support"
          className="text-blue-500 underline"
        >
          officialbyteai@gmail.com
        </a>
        . We aim to reply within two business days.
      </p>

      <h2 className="text-xl font-bold text-black dark:text-white mb-3">Frequently asked questions</h2>

      <h3 className="font-semibold text-black dark:text-white mt-6 mb-2">How do I create an account?</h3>
      <p className="mb-6">
        You can sign up using Sign in with Apple or Sign in with Google &mdash; either on the web at{" "}
        <a href="https://www.byteaiofficial.com" className="text-blue-500 underline">
          byteaiofficial.com
        </a>{" "}
        or in the iOS app. After signing in, you complete a short onboarding flow (display name, role,
        interests) and you are in.
      </p>

      <h3 className="font-semibold text-black dark:text-white mt-6 mb-2">How do I delete my account?</h3>
      <p className="mb-6">
        Email{" "}
        <a href="mailto:officialbyteai@gmail.com?subject=Delete%20Account" className="text-blue-500 underline">
          officialbyteai@gmail.com
        </a>{" "}
        from the email address tied to your account with the subject &ldquo;Delete Account.&rdquo; We delete
        your personal information immediately. Posts you have shared may remain visible in copies already
        distributed in good faith, with your username anonymized.
      </p>

      <h3 className="font-semibold text-black dark:text-white mt-6 mb-2">How do I report a post, comment, or user?</h3>
      <p className="mb-6">
        Tap the overflow menu (the &ldquo;&hellip;&rdquo; icon) on any post, comment, profile, or message
        and choose &ldquo;Report.&rdquo; Tell us why &mdash; spam, harassment, hate speech, sexual content,
        off-topic, misinformation, or other. We review reports within 24 hours and remove content that
        violates our{" "}
        <a href="/terms" className="text-blue-500 underline">
          Terms of Service
        </a>
        .
      </p>

      <h3 className="font-semibold text-black dark:text-white mt-6 mb-2">How do I block another user?</h3>
      <p className="mb-6">
        Open the user&rsquo;s profile, tap the overflow menu, and choose &ldquo;Block.&rdquo; Blocked users
        will not see your posts or messages and you will not see theirs. You can unblock anyone later from
        Settings &rarr; Privacy &rarr; Blocked Users.
      </p>

      <h3 className="font-semibold text-black dark:text-white mt-6 mb-2">My byte was rejected by moderation. Why?</h3>
      <p className="mb-6">
        Every post is screened by an automated layer (spam, profanity, PII) and an AI safety layer
        (harassment, hate, off-topic, prompt injection). If your post was flagged, the rejection screen
        shows the specific reason and gives you a chance to revise. If you believe the rejection was
        incorrect, email us with the post text and we will review.
      </p>

      <h3 className="font-semibold text-black dark:text-white mt-6 mb-2">I forgot my password.</h3>
      <p className="mb-6">
        ByteAI uses Sign in with Apple and Sign in with Google &mdash; we do not store passwords. To recover
        access, reset the credentials for your Apple ID or Google account through Apple or Google directly,
        then sign back in.
      </p>

      <h3 className="font-semibold text-black dark:text-white mt-6 mb-2">The iOS app crashed or behaves oddly.</h3>
      <p className="mb-6">
        Try force-quitting the app and reopening. If the issue persists, email us with: device model
        (e.g. iPhone 15 Pro), iOS version (Settings &rarr; General &rarr; About), the app version (Settings
        &rarr; About inside ByteAI), and a description of what you were doing when it happened. Screenshots
        or screen recordings help.
      </p>

      <h3 className="font-semibold text-black dark:text-white mt-6 mb-2">How do I disable Face ID lock?</h3>
      <p className="mb-6">
        In the iOS app, go to Settings &rarr; Privacy &rarr; Biometric Lock and toggle it off. Face ID data
        never leaves your device &mdash; it is processed by Apple&rsquo;s Secure Enclave; we only receive a
        success/failure signal.
      </p>

      <h3 className="font-semibold text-black dark:text-white mt-6 mb-2">Where can I read your privacy policy and terms?</h3>
      <p className="mb-10">
        Privacy Policy:{" "}
        <a href="/privacy" className="text-blue-500 underline">
          byteaiofficial.com/privacy
        </a>
        <br />
        Terms of Service:{" "}
        <a href="/terms" className="text-blue-500 underline">
          byteaiofficial.com/terms
        </a>
        <br />
        Cookie Policy:{" "}
        <a href="/cookies" className="text-blue-500 underline">
          byteaiofficial.com/cookies
        </a>
      </p>

      <h2 className="text-xl font-bold text-black dark:text-white mb-3">Service status</h2>
      <p className="mb-10">
        If ByteAI seems to be down, email us and we will confirm. We currently do not publish a public
        status page. Most outages last under five minutes.
      </p>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-16 border-t border-gray-200 dark:border-gray-700 pt-6">
        ByteAI &mdash; Support
      </p>
    </main>
  );
}
