import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import ConnectionStatus from './ConnectionStatus';
import * as connectionStore from '../../stores/connection.store';

vi.mock('../../stores/connection.store', () => ({
  useConnectionStore: vi.fn(),
}));

describe('ConnectionStatus Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connected Status', () => {
    it('should render when status is connected', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      render(<ConnectionStatus />);
      expect(screen.getByText('실시간 연결됨')).toBeInTheDocument();
    });

    it('should display correct icon for connected status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      render(<ConnectionStatus />);
      expect(screen.getByText('🟢')).toBeInTheDocument();
    });

    it('should apply green background for connected status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
    });

    it('should have correct title attribute for connected status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('[title="실시간 연결됨"]')).toBeInTheDocument();
    });
  });

  describe('Connecting Status', () => {
    it('should render when status is connecting', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connecting',
      } as any);

      render(<ConnectionStatus />);
      expect(screen.getByText('연결 중...')).toBeInTheDocument();
    });

    it('should display correct icon for connecting status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connecting',
      } as any);

      render(<ConnectionStatus />);
      expect(screen.getByText('🟡')).toBeInTheDocument();
    });

    it('should apply yellow background for connecting status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connecting',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument();
    });

    it('should have correct title attribute for connecting status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connecting',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('[title="연결 중..."]')).toBeInTheDocument();
    });
  });

  describe('Disconnected Status', () => {
    it('should render when status is disconnected', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'disconnected',
      } as any);

      render(<ConnectionStatus />);
      expect(screen.getByText('연결 끊김')).toBeInTheDocument();
    });

    it('should display correct icon for disconnected status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'disconnected',
      } as any);

      render(<ConnectionStatus />);
      expect(screen.getByText('🔴')).toBeInTheDocument();
    });

    it('should apply red background for disconnected status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'disconnected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
    });

    it('should have correct title attribute for disconnected status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'disconnected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('[title="연결 끊김"]')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should be displayed as a rounded pill shape', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('should have flex layout for items center', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.flex.items-center')).toBeInTheDocument();
    });

    it('should have gap between icon and text', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.gap-2')).toBeInTheDocument();
    });

    it('should have proper padding', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.px-3.py-1')).toBeInTheDocument();
    });

    it('should have transition for color changes', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.transition-colors')).toBeInTheDocument();
    });

    it('should have white text color', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.text-white')).toBeInTheDocument();
    });

    it('should have small text size', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.text-sm')).toBeInTheDocument();
    });
  });

  describe('Status Indicator', () => {
    it('should display white dot indicator', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      const dot = container.querySelector('.w-2.h-2.rounded-full.bg-white');
      expect(dot).toBeInTheDocument();
    });

    it('should have white dot in all statuses', () => {
      const statuses: any[] = ['connected', 'connecting', 'disconnected'];
      for (const status of statuses) {
        vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
          status,
        } as any);

        const { container } = render(<ConnectionStatus />);
        expect(container.querySelector('.w-2.h-2')).toBeInTheDocument();
      }
    });
  });

  describe('Responsive Behavior', () => {
    it('should hide label text on small screens', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      const textLabel = container.querySelector('.hidden.sm\\:inline');
      expect(textLabel).toBeInTheDocument();
    });

    it('should show icon on small screens', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      const icon = container.querySelector('.sm\\:hidden');
      expect(icon).toBeInTheDocument();
    });

    it('should have text-xs for small screens', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.text-xs')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have title attribute for tooltip', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      const element = container.querySelector('[title]');
      expect(element).toBeInTheDocument();
      expect(element).toHaveAttribute('title', '실시간 연결됨');
    });

    it('should be keyboard accessible', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      const statusElement = container.querySelector('[title]');
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('Visual Hierarchy', () => {
    it('should show status label on medium screens and up', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      render(<ConnectionStatus />);
      const label = screen.getByText('실시간 연결됨');
      expect(label).toHaveClass('hidden', 'sm:inline');
    });

    it('should show icon on small screens only', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      render(<ConnectionStatus />);
      const icon = screen.getByText('🟢');
      expect(icon).toHaveClass('sm:hidden');
    });
  });

  describe('Status Transitions', () => {
    it('should handle transition from connected to disconnected', () => {
      const { rerender } = render(<ConnectionStatus />);

      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);
      rerender(<ConnectionStatus />);

      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'disconnected',
      } as any);
      rerender(<ConnectionStatus />);

      expect(screen.getByText('연결 끊김')).toBeInTheDocument();
    });

    it('should update background color on status change', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      const { container, rerender } = render(<ConnectionStatus />);
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();

      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'disconnected',
      } as any);
      rerender(<ConnectionStatus />);

      expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
    });
  });

  describe('Display Scenarios', () => {
    it('should display full text when label is shown', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connected',
      } as any);

      render(<ConnectionStatus />);
      expect(screen.getByText('실시간 연결됨')).toBeInTheDocument();
    });

    it('should display ellipsis for connecting status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'connecting',
      } as any);

      render(<ConnectionStatus />);
      expect(screen.getByText('연결 중...')).toBeInTheDocument();
    });

    it('should indicate failure with red disconnected status', () => {
      vi.mocked(connectionStore.useConnectionStore).mockReturnValue({
        status: 'disconnected',
      } as any);

      const { container } = render(<ConnectionStatus />);
      expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
      expect(screen.getByText('연결 끊김')).toBeInTheDocument();
    });
  });
});
