import { Component, createRef, type ErrorInfo, type ReactNode } from 'react'
import { primaryButton, secondaryButton } from '../ui/styles'

interface Props {
  children: ReactNode
  /** Test seam. Defaults to reloading the page. */
  onReload?: () => void
}
interface State {
  error: Error | null
}

/**
 * Last line of defence: if anything above the 3D boundary throws while rendering, show a recoverable message
 * instead of a blank page. Progress lives in the stores and local storage, so "Try again" re-renders from them
 * and "Reload" starts the page over from saved progress. Uses only plain markup and the shared button styles.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  private heading = createRef<HTMLHeadingElement>()

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // React already reports the error to the console. Nothing is sent anywhere.
  }

  // Move focus to the message so keyboard and screen reader users land on it (first render, or a later crash).
  componentDidMount() {
    this.heading.current?.focus()
  }

  componentDidUpdate(_prev: Props, prev: State) {
    if (this.state.error && !prev.error) this.heading.current?.focus()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-6 text-observatory-text">
        <div role="alert" className="flex flex-col gap-4">
        <h1 ref={this.heading} tabIndex={-1} className="text-3xl font-bold text-observatory-gold outline-none">
          Something went wrong
        </h1>
        <p>
          The lab hit an unexpected problem and stopped. Nothing was sent anywhere, and the progress this browser saved is
          still there.
        </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={primaryButton} onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => (this.props.onReload ?? (() => window.location.reload()))()}
          >
            Reload the lab
          </button>
        </div>
      </main>
    )
  }
}
