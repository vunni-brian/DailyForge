import { AppProvider } from './context/app-context'
import { AppRouter } from './app/router'

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}

export default App
