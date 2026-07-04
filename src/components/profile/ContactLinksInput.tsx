import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { ContactLink, ContactType } from '../../types';
import { CONTACT_TYPES, CONTACT_TYPE_MAP } from '../../constants/contactTypes';

export interface ContactLinksInputProps {
  /** Contact links currently entered (controlled). */
  value?: ContactLink[];
  /** Called with the next list when a row is added, edited or removed. */
  onChange?: (links: ContactLink[]) => void;
}

/**
 * Add/remove typed contact links. Each row is a type selector + value input;
 * the value is validated per type (email vs. http(s) URL) with an inline,
 * `aria-describedby`-announced error. Rows are grouped in a fieldset. Emits the
 * full list on every change — the parent decides which links to persist.
 */
export function ContactLinksInput({
  value = [],
  onChange,
}: ContactLinksInputProps) {
  const { t } = useTranslation();
  const ids = useId();

  const update = (index: number, next: ContactLink) => {
    onChange?.(value.map((link, i) => (i === index ? next : link)));
  };
  const addLink = () => {
    onChange?.([...value, { type: 'email', value: '' }]);
  };
  const removeLink = (index: number) => {
    onChange?.(value.filter((_, i) => i !== index));
  };

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium text-slate-700">
        {t('contact.legend')}
      </legend>

      {value.length === 0 && (
        <p className="text-sm text-slate-500">{t('contact.empty')}</p>
      )}

      <ul className="space-y-3">
        {value.map((link, index) => {
          const config = CONTACT_TYPE_MAP[link.type];
          const typeId = `${ids}-type-${index}`;
          const valueId = `${ids}-value-${index}`;
          const errorId = `${ids}-error-${index}`;
          const invalid =
            link.value.trim() !== '' && !config.validate(link.value);
          return (
            <li
              key={index}
              className="flex flex-wrap items-start gap-3 rounded border border-slate-200 p-3"
            >
              <div>
                <label
                  htmlFor={typeId}
                  className="block text-xs font-medium text-slate-600"
                >
                  {t('contact.typeLabel')}
                </label>
                <select
                  id={typeId}
                  className="mt-1 rounded border border-slate-300 px-2 py-2"
                  value={link.type}
                  onChange={(e) =>
                    update(index, {
                      type: e.target.value as ContactType,
                      value: link.value,
                    })
                  }
                >
                  {CONTACT_TYPES.map((c) => (
                    <option key={c.type} value={c.type}>
                      {t(c.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label
                  htmlFor={valueId}
                  className="block text-xs font-medium text-slate-600"
                >
                  {t('contact.valueLabel')}
                </label>
                <input
                  id={valueId}
                  type={config.inputType}
                  className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                  placeholder={t(config.placeholderKey)}
                  value={link.value}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? errorId : undefined}
                  onChange={(e) =>
                    update(index, { type: link.type, value: e.target.value })
                  }
                />
                {invalid && (
                  <p
                    id={errorId}
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {t(config.errorKey)}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="mt-6 rounded border border-slate-300 px-3 py-2 text-sm text-red-600"
                onClick={() => removeLink(index)}
              >
                {t('contact.remove')}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="rounded bg-indigo-600 px-3 py-2 text-sm text-white"
        onClick={addLink}
      >
        {t('contact.add')}
      </button>
    </fieldset>
  );
}

export default ContactLinksInput;
