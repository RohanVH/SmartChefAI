export default function IngredientCard({ ingredient, onRemove }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-700 bg-stone-900/70 px-3 py-2">
      <span className="text-sm text-stone-100">{ingredient}</span>
      <button onClick={() => onRemove(ingredient)} className="ml-3 text-xs text-red-300 hover:text-red-200" aria-label={`Remove ${ingredient}`}>
        Remove
      </button>
    </div>
  );
}
