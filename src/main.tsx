import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProjectProvider } from './project'
import { AppShell } from './AppShell'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProjectProvider>
      <AppShell />
    </ProjectProvider>
  </StrictMode>,
)
