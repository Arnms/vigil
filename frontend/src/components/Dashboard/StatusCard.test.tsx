import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import StatusCard from './StatusCard';

describe('StatusCard Component', () => {
  describe('Rendering', () => {
    it('should render the title', () => {
      render(<StatusCard title="Uptime" value="99.5" />);
      expect(screen.getByText('Uptime')).toBeInTheDocument();
    });

    it('should render the value', () => {
      render(<StatusCard title="Uptime" value="99.5" />);
      expect(screen.getByText(/99.5/)).toBeInTheDocument();
    });

    it('should render the value with unit', () => {
      render(<StatusCard title="Uptime" value="99.5" unit="%" />);
      const element = screen.getByText('%');
      expect(element).toBeInTheDocument();
    });

    it('should render numeric value', () => {
      render(<StatusCard title="Endpoints" value={42} />);
      expect(screen.getByText(/42/)).toBeInTheDocument();
    });

    it('should render the icon when provided', () => {
      render(<StatusCard title="Status" value="Active" icon="✅" />);
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('should not render icon when not provided', () => {
      render(<StatusCard title="Status" value="Active" />);
      expect(screen.queryByText('✅')).not.toBeInTheDocument();
    });
  });

  describe('Trend Indicators', () => {
    it('should display uptrend indicator', () => {
      render(<StatusCard title="Performance" value="95%" trend="up" />);
      expect(screen.getByText('📈')).toBeInTheDocument();
    });

    it('should display downtrend indicator', () => {
      render(<StatusCard title="Performance" value="95%" trend="down" />);
      expect(screen.getByText('📉')).toBeInTheDocument();
    });

    it('should display stable trend indicator', () => {
      render(<StatusCard title="Performance" value="95%" trend="stable" />);
      expect(screen.getByText('➡️')).toBeInTheDocument();
    });

    it('should default to stable trend', () => {
      render(<StatusCard title="Performance" value="95%" />);
      expect(screen.getByText('➡️')).toBeInTheDocument();
    });

    it('should have correct color class for uptrend', () => {
      const { container } = render(<StatusCard title="Test" value="100" trend="up" />);
      const trendElement = container.querySelector('.text-green-600');
      expect(trendElement).toBeInTheDocument();
    });

    it('should have correct color class for downtrend', () => {
      const { container } = render(<StatusCard title="Test" value="100" trend="down" />);
      const trendElement = container.querySelector('.text-red-600');
      expect(trendElement).toBeInTheDocument();
    });

    it('should have correct color class for stable trend', () => {
      const { container } = render(<StatusCard title="Test" value="100" trend="stable" />);
      const trendElement = container.querySelector('.text-gray-600');
      expect(trendElement).toBeInTheDocument();
    });
  });

  describe('Color Schemes', () => {
    it('should apply green color scheme', () => {
      const { container } = render(
        <StatusCard title="Health" value="Good" color="green" />
      );
      expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
      expect(container.querySelector('.border-green-200')).toBeInTheDocument();
    });

    it('should apply red color scheme', () => {
      const { container } = render(
        <StatusCard title="Issues" value="Critical" color="red" />
      );
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
      expect(container.querySelector('.border-red-200')).toBeInTheDocument();
    });

    it('should apply blue color scheme', () => {
      const { container } = render(
        <StatusCard title="Info" value="Data" color="blue" />
      );
      expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
      expect(container.querySelector('.border-blue-200')).toBeInTheDocument();
    });

    it('should apply yellow color scheme', () => {
      const { container } = render(
        <StatusCard title="Warning" value="Alert" color="yellow" />
      );
      expect(container.querySelector('.bg-yellow-50')).toBeInTheDocument();
      expect(container.querySelector('.border-yellow-200')).toBeInTheDocument();
    });

    it('should default to blue color scheme', () => {
      const { container } = render(<StatusCard title="Default" value="Blue" />);
      expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
      expect(container.querySelector('.border-blue-200')).toBeInTheDocument();
    });

    it('should apply text color based on color scheme', () => {
      const { container } = render(
        <StatusCard title="Health" value="Good" color="green" />
      );
      const valueElement = container.querySelector('.text-green-900');
      expect(valueElement).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should render as a bordered card', () => {
      const { container } = render(<StatusCard title="Test" value="100" />);
      expect(container.querySelector('.border')).toBeInTheDocument();
      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    });

    it('should have proper padding', () => {
      const { container } = render(<StatusCard title="Test" value="100" />);
      expect(container.querySelector('.p-6')).toBeInTheDocument();
    });

    it('should display value in large font', () => {
      const { container } = render(<StatusCard title="Test" value="100" />);
      const valueElement = container.querySelector('.text-3xl');
      expect(valueElement).toBeInTheDocument();
    });

    it('should display title in small font', () => {
      const container = render(<StatusCard title="Test" value="100" />);
      const titleElement = container.container.querySelector('.text-sm');
      expect(titleElement).toBeInTheDocument();
    });

    it('should position icon on the right', () => {
      const { container } = render(
        <StatusCard title="Test" value="100" icon="🔔" />
      );
      const flexContainer = container.querySelector('.flex.items-start.justify-between');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('Data Display Scenarios', () => {
    it('should handle percentage values with unit', () => {
      render(<StatusCard title="Uptime" value="99.99" unit="%" />);
      expect(screen.getByText('99.99')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('should handle millisecond values', () => {
      render(<StatusCard title="Response Time" value={245} unit="ms" />);
      expect(screen.getByText('245')).toBeInTheDocument();
      expect(screen.getByText('ms')).toBeInTheDocument();
    });

    it('should handle long text values', () => {
      const longValue = 'Database Connection Established';
      render(<StatusCard title="Status" value={longValue} />);
      expect(screen.getByText(longValue)).toBeInTheDocument();
    });

    it('should display zero value', () => {
      render(<StatusCard title="Failures" value={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      render(<StatusCard title="Change" value="-5.2" unit="%" />);
      expect(screen.getByText('-5.2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(<StatusCard title="Test" value="100" />);
      const card = container.querySelector('.border.rounded-lg');
      expect(card).toBeInTheDocument();
    });

    it('should display title and value text clearly', () => {
      render(<StatusCard title="Availability" value="99.5" unit="%" />);
      expect(screen.getByText('Availability')).toBeVisible();
      expect(screen.getByText('99.5')).toBeVisible();
    });
  });

  describe('Component Props Combinations', () => {
    it('should handle all props together', () => {
      const { container } = render(
        <StatusCard
          title="System Health"
          value={98.5}
          unit="%"
          icon="🏥"
          trend="up"
          color="green"
        />
      );

      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('98.5')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();
      expect(screen.getByText('🏥')).toBeInTheDocument();
      expect(screen.getByText('📈')).toBeInTheDocument();
      expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
    });

    it('should handle minimal props', () => {
      render(<StatusCard title="Basic" value="Data" />);
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
    });
  });
});
