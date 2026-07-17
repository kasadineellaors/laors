import { Input, type InputProps } from "@/components/ui/input";

export interface SuggestionInputProps extends Omit<InputProps, "list"> {
  suggestions: string[];
  listId?: string;
}

export function SuggestionInput({
  suggestions,
  listId,
  id,
  ...props
}: SuggestionInputProps) {
  const datalistId = listId ?? (id ? `${id}-suggestions` : undefined);
  const showList = suggestions.length > 0 && datalistId;

  return (
    <>
      <Input {...props} id={id} list={showList ? datalistId : undefined} />
      {showList ? (
        <datalist id={datalistId}>
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}
