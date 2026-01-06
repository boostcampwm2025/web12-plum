import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('displays the Plum App text', () => {
    render(<App />);
    expect(screen.getByText('Plum App')).toBeInTheDocument();
  });
});
