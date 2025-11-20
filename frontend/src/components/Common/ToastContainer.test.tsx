import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import ToastContainer from './ToastContainer';
import * as toastStore from '../../stores/toast.store';

vi.mock('../../stores/toast.store', () => ({
  useToastStore: vi.fn(),
}));

describe('ToastContainer Component', () => {
  const mockRemoveToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render anything when there are no toasts', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
    });

    it('should render a single toast', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: 'Success message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should render multiple toasts', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          { id: '1', type: 'success', message: 'Success' },
          { id: '2', type: 'error', message: 'Error' },
          { id: '3', type: 'info', message: 'Info' },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });
  });

  describe('Toast Types', () => {
    it('should render success toast with correct styling', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: 'Success message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
    });

    it('should render success toast with correct icon', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: 'Success message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('should render error toast with correct styling', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'error',
            message: 'Error message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
    });

    it('should render error toast with correct icon', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'error',
            message: 'Error message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('should render warning toast with correct styling', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'warning',
            message: 'Warning message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument();
    });

    it('should render warning toast with correct icon', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'warning',
            message: 'Warning message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should render info toast with correct styling', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'info',
            message: 'Info message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
    });

    it('should render info toast with correct icon', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'info',
            message: 'Info message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      expect(screen.getByText('ℹ️')).toBeInTheDocument();
    });
  });

  describe('Closing Toasts', () => {
    it('should call removeToast when close button is clicked', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: 'Success message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      const closeButton = screen.getByRole('button', { name: 'Close notification' });
      fireEvent.click(closeButton);

      expect(mockRemoveToast).toHaveBeenCalledWith('1');
    });

    it('should remove the correct toast when multiple toasts exist', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          { id: '1', type: 'success', message: 'Success' },
          { id: '2', type: 'error', message: 'Error' },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      const closeButtons = screen.getAllByRole('button', { name: 'Close notification' });
      fireEvent.click(closeButtons[1]); // Click close on second toast

      expect(mockRemoveToast).toHaveBeenCalledWith('2');
    });
  });

  describe('Accessibility', () => {
    it('should have alert role for accessibility', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: 'Success message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
    });

    it('should have proper aria-label on close button', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: 'Success message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      const closeButton = screen.getByRole('button', { name: 'Close notification' });
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
    });

    it('should have white text color for readability', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: 'Success message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      expect(container.querySelector('.text-white')).toBeInTheDocument();
    });
  });

  describe('Styling and Animation', () => {
    it('should be positioned fixed top-right', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      const toastContainer = container.querySelector('.fixed.top-4.right-4');
      expect(toastContainer).toBeInTheDocument();
    });

    it('should have z-index for visibility', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      expect(container.querySelector('.z-50')).toBeInTheDocument();
    });

    it('should have animation classes', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: 'Success message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      const toast = container.querySelector('.animate-in');
      expect(toast).toBeInTheDocument();
    });

    it('should have shadow for depth', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: 'Success message',
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      expect(container.querySelector('.shadow-lg')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should display toasts in a vertical flex column', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          { id: '1', type: 'success', message: 'Success' },
          { id: '2', type: 'error', message: 'Error' },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      const flexContainer = container.querySelector('.flex.flex-col');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should have gap between multiple toasts', () => {
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          { id: '1', type: 'success', message: 'Success' },
          { id: '2', type: 'error', message: 'Error' },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      const { container } = render(<ToastContainer />);
      const flexContainer = container.querySelector('.gap-2');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should display toast message clearly', () => {
      const message = 'This is a test message';
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message,
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('should handle long messages', () => {
      const longMessage = 'This is a very long message that might wrap to multiple lines depending on the screen size';
      vi.mocked(toastStore.useToastStore).mockReturnValue({
        toasts: [
          {
            id: '1',
            type: 'success',
            message: longMessage,
          },
        ],
        removeToast: mockRemoveToast,
        addToast: vi.fn(),
      } as any);

      render(<ToastContainer />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });
});
