import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Called once when a descendant throws, so the parent can switch to the schematic view. */
  onError: (error: Error) => void
}

interface State {
  failed: boolean
}

/** Catches render and lazy-chunk load failures from the 3D scene. Renders nothing itself on failure. */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
