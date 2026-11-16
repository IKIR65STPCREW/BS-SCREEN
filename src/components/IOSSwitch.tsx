interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
}

export function IOSSwitch({ checked, onChange, label, id }: Props) {
  return (
    <label className="ios-switch-row" htmlFor={id}>
      {label && <span className="ios-switch-label">{label}</span>}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`ios-switch ${checked ? "on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="ios-switch-knob" />
      </button>
    </label>
  );
}
