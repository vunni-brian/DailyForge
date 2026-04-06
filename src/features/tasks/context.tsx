import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { tasksApi } from './api'
import type { CreateTaskInput, Task, TaskStatus } from '../../types'

interface TasksContextValue {
  tasks: Task[]
  hydrated: boolean
  addTask: (input: CreateTaskInput) => void
  updateTask: (taskId: string, patch: Partial<Task>) => void
  moveTask: (taskId: string, status: TaskStatus) => void
  replaceTasks: (
    tasks: Task[],
    options?: {
      persisted?: boolean
    },
  ) => void
}

const TasksContext = createContext<TasksContextValue | null>(null)

function getTaskFingerprint(tasks: Task[]) {
  return JSON.stringify(tasks)
}

export function TaskProvider({ children }: PropsWithChildren) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [hydrated, setHydrated] = useState(false)
  const lastSavedFingerprint = useRef('')
  const pendingSave = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let active = true

    void tasksApi
      .listTasks()
      .then((loadedTasks) => {
        if (!active) {
          return
        }

        setTasks(loadedTasks)
        lastSavedFingerprint.current = getTaskFingerprint(loadedTasks)
        setHydrated(true)
      })
      .catch((error) => {
        if (!active) {
          return
        }

        console.error('Failed to load persisted tasks.', error)
        lastSavedFingerprint.current = getTaskFingerprint([])
        setHydrated(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    const nextFingerprint = getTaskFingerprint(tasks)

    if (nextFingerprint === lastSavedFingerprint.current) {
      return
    }

    pendingSave.current = pendingSave.current
      .catch(() => undefined)
      .then(async () => {
        if (nextFingerprint === lastSavedFingerprint.current) {
          return
        }

        await tasksApi.saveTasks(tasks)
        lastSavedFingerprint.current = nextFingerprint
      })
      .catch((error) => {
        console.error('Failed to persist tasks.', error)
      })
  }, [hydrated, tasks])

  const addTask = (input: CreateTaskInput) => {
    setTasks((current) => tasksApi.createTask(current, input))
  }

  const updateTask = (taskId: string, patch: Partial<Task>) => {
    setTasks((current) => tasksApi.updateTask(current, taskId, patch))
  }

  const moveTask = (taskId: string, status: TaskStatus) => {
    setTasks((current) => tasksApi.moveTask(current, taskId, status))
  }

  const replaceTasks = (
    nextTasks: Task[],
    options?: {
      persisted?: boolean
    },
  ) => {
    if (options?.persisted) {
      lastSavedFingerprint.current = getTaskFingerprint(nextTasks)
    }
    setTasks(nextTasks)
  }

  return (
    <TasksContext.Provider
      value={{
        tasks,
        hydrated,
        addTask,
        updateTask,
        moveTask,
        replaceTasks,
      }}
    >
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  const context = useContext(TasksContext)

  if (!context) {
    throw new Error('useTasks must be used inside TaskProvider')
  }

  return context
}
