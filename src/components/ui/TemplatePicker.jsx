import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, FileText, Globe, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { BUILT_IN_TEMPLATES } from '@/lib/promptTemplates';

/**
 * TemplatePicker — reusable prompt template selector.
 *
 * Props:
 *   value        — currently selected template object (or null)
 *   onChange     — called with template object when user selects
 *   modelFamily  — optional filter (e.g. 'kling', 'veo', 'all')
 *   className    — additional wrapper classes
 */
export default function TemplatePicker({ value, onChange, modelFamily, className }) {
  const [open, setOpen] = useState(false);
  const [userTemplates, setUserTemplates] = useState([]);
  const [publicTemplates, setPublicTemplates] = useState([]);
  const [expandedPreview, setExpandedPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch user templates on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch('/api/prompt/templates');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setUserTemplates(data.templates || []);
        setPublicTemplates(data.publicTemplates || []);
      } catch {
        // silently fail — user just won't see custom templates
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Filter built-in templates by model family
  const filteredBuiltIn = useMemo(() => {
    if (!modelFamily || modelFamily === 'all') return BUILT_IN_TEMPLATES;
    return BUILT_IN_TEMPLATES.filter(
      (t) => t.model_family === 'all' || t.model_family === modelFamily
    );
  }, [modelFamily]);

  // Group built-in by category
  const groupedBuiltIn = useMemo(() => {
    const groups = {};
    for (const t of filteredBuiltIn) {
      const cat = t.category.charAt(0).toUpperCase() + t.category.slice(1);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  }, [filteredBuiltIn]);

  // Filter user/public templates by model family
  const filteredUser = useMemo(() => {
    if (!modelFamily || modelFamily === 'all') return userTemplates;
    return userTemplates.filter(
      (t) => t.model_family === 'all' || t.model_family === modelFamily
    );
  }, [userTemplates, modelFamily]);

  const filteredPublic = useMemo(() => {
    if (!modelFamily || modelFamily === 'all') return publicTemplates;
    return publicTemplates.filter(
      (t) => t.model_family === 'all' || t.model_family === modelFamily
    );
  }, [publicTemplates, modelFamily]);

  function handleSelect(template) {
    onChange(template);
    setOpen(false);
    setExpandedPreview(null);
  }

  function togglePreview(e, templateId) {
    e.stopPropagation();
    setExpandedPreview((prev) => (prev === templateId ? null : templateId));
  }

  const sectionLabels = {
    camera: 'Camera',
    subject: 'Subject',
    environment: 'Environment',
    motion: 'Motion',
    style: 'Style',
  };

  function renderTemplateItem(template) {
    const isSelected = value?.id === template.id;
    const isExpanded = expandedPreview === template.id;
    const sections = template.sections || template.template?.sections || {};

    return (
      <div key={template.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        <button
          type="button"
          onClick={() => handleSelect(template)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
            isSelected && 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          )}
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="flex-1 truncate">{template.name}</span>
          {template.variables?.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {template.variables.length} var{template.variables.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => togglePreview(e, template.id)}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            )}
          </button>
        </button>

        {isExpanded && (
          <div className="px-3 pb-2 space-y-1.5">
            {Object.entries(sections).map(([key, text]) => (
              <div key={key} className="text-xs">
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {sectionLabels[key] || key}:
                </span>{' '}
                <span className="text-gray-600 dark:text-gray-300 line-clamp-2">{text}</span>
              </div>
            ))}
            {template.variables?.length > 0 && (
              <div className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                Variables: {template.variables.map((v) => `{{${v}}}`).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderGroup(label, icon, templates) {
    if (!templates || templates.length === 0) return null;
    return (
      <div>
        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
          {icon}
          {label}
        </div>
        {templates.map(renderTemplateItem)}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
          'ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring',
          'dark:border-gray-600 dark:text-gray-200',
          !value && 'text-muted-foreground'
        )}
      >
        <span className="truncate">
          {value ? value.name : 'Select a prompt template...'}
        </span>
        <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
            {loading && (
              <div className="px-3 py-4 text-xs text-gray-400 text-center">Loading templates...</div>
            )}

            {/* Clear selection */}
            {value && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full px-3 py-2 text-sm text-left text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
              >
                Clear selection
              </button>
            )}

            {/* Built-in groups */}
            {Object.entries(groupedBuiltIn).map(([cat, templates]) =>
              renderGroup(cat, <FileText className="h-3 w-3" />, templates)
            )}

            {/* User templates */}
            {renderGroup('My Templates', <User className="h-3 w-3" />, filteredUser)}

            {/* Public templates */}
            {renderGroup('Community', <Globe className="h-3 w-3" />, filteredPublic)}

            {filteredBuiltIn.length === 0 && filteredUser.length === 0 && filteredPublic.length === 0 && !loading && (
              <div className="px-3 py-4 text-xs text-gray-400 text-center">No templates available</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
