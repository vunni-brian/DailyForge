import { AppProvider } from './context/app-context'
import { AppRouter } from './app/router'
import { TaskProvider } from './features/tasks/context'

function App() {
  return (
    <TaskProvider>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </TaskProvider>
  )
}

export default App
