import type { ModuleInfo } from '../../project/types';
import './PlaceholderModule.css';

interface Props {
  module: ModuleInfo;
}

export function PlaceholderModule({ module }: Props) {
  return (
    <div className="placeholder-module">
      <div className="placeholder-icon">{module.icon}</div>
      <h2>{module.name}</h2>
      <p>{module.description}</p>
      <div className="coming-soon">Coming Soon</div>
    </div>
  );
}

