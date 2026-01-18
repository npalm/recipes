interface InstructionListProps {
  instructions: string[];
}

/**
 * Recipe instruction list
 */
export function InstructionList({ instructions }: InstructionListProps) {
  if (instructions.length === 0) {
    return (
      <p className="text-muted-foreground">No instructions available.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {instructions.map((instruction, index) => (
        <li key={index} className="flex gap-4">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {index + 1}
          </span>
          <p className="flex-1 pt-0.5 text-sm leading-relaxed">{instruction}</p>
        </li>
      ))}
    </ol>
  );
}
