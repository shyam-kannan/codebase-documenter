# Documentation Viewer Feature Guide

A comprehensive guide to the premium documentation viewer built for the Codebase Documentation System.

## Overview

The Documentation Viewer is a beautiful, professional modal component that displays AI-generated documentation with markdown rendering, syntax highlighting, and smooth animations. It provides a premium reading experience similar to Notion, GitBook, or ReadMe.io.

## Features

### 🎨 Visual Design

#### Modal Layout
- **Full-screen overlay** with backdrop blur effect
- **Dark semi-transparent backdrop** (80% opacity)
- **Centered modal** with maximum width of 1200px
- **Responsive design** that adapts to all screen sizes
- **Custom scrollbar** with theme-aware styling

#### Typography
- **Tailwind Typography Plugin** for professional text styling
- **Optimized line height** and spacing for readability
- **Semantic heading hierarchy** (H1-H6)
- **Proper list and paragraph spacing**
- **Monospace fonts** for code blocks

#### Color Scheme
- **Light mode**: White background, dark text
- **Dark mode ready**: Custom scrollbar colors for dark themes
- **VS Code Dark Plus** theme for code syntax highlighting

### ✨ Interactive Elements

#### Copy Code Button
```tsx
// Appears on hover over code blocks
<button onClick={() => handleCopyCode(codeString)}>
  📋 Copy
</button>
```

**Behavior:**
- Hidden by default, appears on hover
- One-click copying to clipboard
- Success toast notification
- Error handling for clipboard failures

#### Download Button
```tsx
// In modal header
<button onClick={handleDownload}>
  ⬇️ Download
</button>
```

**Behavior:**
- Downloads documentation as `.md` file
- Filename format: `{repository-name}-documentation.md`
- Uses browser's native download functionality

#### Close Actions
- **ESC key**: Press ESC to close modal
- **Click outside**: Click backdrop to close
- **Close button**: X button in top-right corner

### 🎬 Animations (Framer Motion)

#### Modal Backdrop
```tsx
// Fade in/out
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.2 }}
```

#### Modal Content
```tsx
// Scale and slide up
initial={{ opacity: 0, scale: 0.95, y: 10 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.95, y: 10 }}
transition={{ type: "spring", duration: 0.3 }}
```

**Effect:**
- Smooth fade-in when opening
- Slight scale effect (95% to 100%)
- 10px upward slide
- Spring animation for natural feel
- Quick fade-out when closing

### 📝 Markdown Support

The viewer uses **react-markdown** with custom components for enhanced rendering:

#### Supported Markdown Elements

**Headings**
```markdown
# H1 Heading
## H2 Heading
### H3 Heading
```

**Lists**
```markdown
- Unordered list item
- Another item

1. Ordered list item
2. Another item
```

**Code Blocks**
````markdown
```python
def hello():
    print("Hello, World!")
```
````

**Inline Code**
```markdown
Use the `npm install` command
```

**Links**
```markdown
[Link text](https://example.com)
```

**Images**
```markdown
![Alt text](image-url.png)
```

**Blockquotes**
```markdown
> This is a blockquote
```

**Tables**
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

**Horizontal Rules**
```markdown
---
```

### 🎨 Syntax Highlighting

Powered by **react-syntax-highlighter** with VS Code Dark Plus theme:

#### Supported Languages
- Python
- JavaScript/TypeScript
- Java
- C/C++
- Go
- Rust
- Ruby
- PHP
- SQL
- JSON
- YAML
- Markdown
- And many more...

#### Custom Styling
```tsx
<SyntaxHighlighter
  style={vscDarkPlus}
  language={match[1]}
  PreTag="div"
  customStyle={{
    borderRadius: "0.5rem",
    padding: "1.5rem",
    margin: 0,
  }}
>
  {codeString}
</SyntaxHighlighter>
```

**Features:**
- **Automatic language detection** from markdown fence info
- **Line wrapping** for long code lines
- **Rounded corners** (0.5rem)
- **Generous padding** (1.5rem)
- **Dark background** with vibrant syntax colors

### 🔧 Technical Implementation

#### Component Props
```typescript
interface DocumentationViewerProps {
  url: string;           // S3 URL of documentation
  isOpen: boolean;       // Modal open state
  onClose: () => void;   // Close handler
  repositoryName: string; // Repository name for filename
}
```

#### State Management
```typescript
const [markdown, setMarkdown] = useState<string>("");
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

#### Data Fetching
```typescript
useEffect(() => {
  if (isOpen && url) {
    fetch(url)
      .then(response => response.text())
      .then(setMarkdown)
      .catch(setError);
  }
}, [isOpen, url]);
```

#### Body Scroll Lock
```typescript
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "unset";
  }
  return () => {
    document.body.style.overflow = "unset";
  };
}, [isOpen]);
```

#### ESC Key Handler
```typescript
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      onClose();
    }
  };
  window.addEventListener("keydown", handleEscape);
  return () => window.removeEventListener("keydown", handleEscape);
}, [isOpen, onClose]);
```

### 📱 Responsive Design

#### Breakpoints
- **Mobile**: Full width with padding
- **Tablet**: 90% width, centered
- **Desktop**: Max 1200px width, centered

#### Tailwind Classes
```tsx
className="w-full max-w-7xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden"
```

**Breakdown:**
- `w-full`: Full width on mobile
- `max-w-7xl`: Maximum 1200px on desktop
- `mx-auto`: Center horizontally
- `bg-white dark:bg-gray-900`: Light/dark background
- `rounded-lg`: Rounded corners
- `shadow-2xl`: Large shadow for depth
- `overflow-hidden`: Prevent content overflow

### 🎯 User Experience

#### Loading State
```tsx
{loading && (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
  </div>
)}
```

**Features:**
- Centered spinner
- Blue accent color
- Smooth rotation animation
- 12rem height for visibility

#### Error State
```tsx
{error && (
  <div className="text-center py-8">
    <p className="text-red-600 mb-4">{error}</p>
    <button onClick={handleRetry}>
      Try Again
    </button>
  </div>
)}
```

**Features:**
- Clear error message
- Retry button
- Red accent for visibility
- Centered layout

### 🎨 Custom Scrollbar

Defined in `globals.css`:

```css
/* Light mode */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Dark mode */
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4a5568;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
```

## Integration with JobStatus

The viewer is integrated into the JobStatus component:

```tsx
import DocumentationViewer from "./DocumentationViewer";

export default function JobStatus({ jobId }: JobStatusProps) {
  const [showViewer, setShowViewer] = useState(false);

  return (
    <>
      {/* View Documentation Button */}
      <button onClick={() => setShowViewer(true)}>
        View Documentation
      </button>

      {/* Documentation Viewer Modal */}
      {job.status === "completed" && job.documentation_url && (
        <DocumentationViewer
          url={job.documentation_url}
          isOpen={showViewer}
          onClose={() => setShowViewer(false)}
          repositoryName={job.github_url.split("/").pop() || "Repository"}
        />
      )}
    </>
  );
}
```

## Toast Notifications

Using **react-hot-toast** for user feedback:

### Configuration (in layout.tsx)
```tsx
<Toaster
  position="bottom-right"
  toastOptions={{
    duration: 3000,
    style: {
      background: "#1f2937",
      color: "#fff",
      borderRadius: "0.5rem",
      padding: "0.75rem 1rem",
    },
    success: {
      iconTheme: {
        primary: "#10b981",
        secondary: "#fff",
      },
    },
    error: {
      iconTheme: {
        primary: "#ef4444",
        secondary: "#fff",
      },
    },
  }}
/>
```

### Usage
```typescript
import toast from "react-hot-toast";

// Success
toast.success("Code copied to clipboard!");

// Error
toast.error("Failed to copy code");
```

## Dependencies

All required packages in `package.json`:

```json
{
  "dependencies": {
    "react-markdown": "9.0.1",
    "react-syntax-highlighter": "15.5.0",
    "framer-motion": "11.0.0",
    "react-hot-toast": "2.4.1"
  },
  "devDependencies": {
    "@types/react-syntax-highlighter": "^15.5.11",
    "@tailwindcss/typography": "^0.5.10"
  }
}
```

### Installation
```bash
cd frontend
npm install
```

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

### Features Used
- Clipboard API
- CSS backdrop-filter
- CSS custom scrollbars (WebKit)
- Framer Motion animations
- ES6+ JavaScript

## Performance

### Optimization Strategies
1. **Lazy Loading**: Modal content only loads when opened
2. **Cleanup**: Event listeners removed on unmount
3. **Debouncing**: No debouncing needed (single fetch)
4. **Code Splitting**: React Markdown and Syntax Highlighter are split

### Bundle Size Impact
- react-markdown: ~50KB
- react-syntax-highlighter: ~200KB (with Prism)
- framer-motion: ~60KB
- react-hot-toast: ~10KB
- **Total**: ~320KB additional bundle size

## Accessibility

### Keyboard Navigation
- ✅ ESC key to close
- ✅ Tab navigation through buttons
- ✅ Focus trap (modal only)

### Screen Readers
- ✅ Semantic HTML structure
- ✅ ARIA labels on buttons
- ✅ Heading hierarchy (H1-H6)

### Color Contrast
- ✅ WCAG AA compliant
- ✅ High contrast text
- ✅ Visible focus indicators

## Future Enhancements

### Planned Features
- [ ] Full-screen mode
- [ ] Print functionality
- [ ] Search within documentation
- [ ] Table of contents sidebar
- [ ] Anchor links to headings
- [ ] Share buttons (Twitter, LinkedIn)
- [ ] Light/dark mode toggle
- [ ] Font size adjustment
- [ ] Export to PDF
- [ ] Commenting/annotations

### Potential Improvements
- [ ] Memoize markdown rendering
- [ ] Virtual scrolling for large docs
- [ ] Progressive loading of sections
- [ ] Offline caching
- [ ] Keyboard shortcuts (Ctrl+F for search)

## Troubleshooting

### Modal doesn't open
**Check:**
1. Is `isOpen` prop set to `true`?
2. Is `url` prop provided?
3. Check console for errors

### Code blocks not highlighting
**Check:**
1. Is language specified in markdown fence?
2. Is `@types/react-syntax-highlighter` installed?
3. Check if language is supported

### Copy button doesn't work
**Check:**
1. Is site served over HTTPS (Clipboard API requirement)?
2. Check browser console for clipboard errors
3. Try on localhost (allowed for Clipboard API)

### Animations stuttering
**Check:**
1. Browser DevTools performance tab
2. Reduce motion preference in OS
3. Try disabling backdrop-filter

### Download not working
**Check:**
1. Browser pop-up blocker
2. Console for download errors
3. Repository name extraction logic

## Code Examples

### Basic Usage
```tsx
import DocumentationViewer from "@/components/DocumentationViewer";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        View Docs
      </button>

      <DocumentationViewer
        url="https://bucket.s3.amazonaws.com/docs/job-id.md"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        repositoryName="my-repo"
      />
    </>
  );
}
```

### With Custom Styling
```tsx
// Extend the component with custom classes
<div className="my-custom-wrapper">
  <DocumentationViewer
    url={docUrl}
    isOpen={isOpen}
    onClose={handleClose}
    repositoryName={repoName}
  />
</div>
```

### Programmatic Control
```tsx
// Open viewer on page load
useEffect(() => {
  if (autoOpen) {
    setShowViewer(true);
  }
}, [autoOpen]);

// Close on route change
useEffect(() => {
  return () => setShowViewer(false);
}, [pathname]);
```

## Summary

The Documentation Viewer provides a premium, professional experience for viewing AI-generated documentation. With smooth animations, syntax highlighting, and a beautiful design, it matches the quality of top documentation platforms like Notion and GitBook.

**Key Benefits:**
- ✨ Beautiful, modern design
- 🚀 Smooth animations
- 📱 Fully responsive
- ♿ Accessible
- 🎨 Syntax highlighting
- 📋 Easy code copying
- ⬇️ Download functionality
- 🎯 Excellent UX

**Total Implementation:**
- 1 main component (DocumentationViewer.tsx)
- Custom CSS for scrollbar
- Toast notifications in layout
- Integration with JobStatus
- ~340 lines of code
- 4 NPM dependencies
