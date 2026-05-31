
const Spinner = () => {
  return (
    // Container with a dark-to-red gradient coming from the top
    // <div className="flex items-center justify-center min-h-[100px] bg-gradient-to-b from-red-950 via-black to-black rounded p-6">
    <div className="flex items-center justify-center min-h-[100px] rounded p-6">
      {/* The spinner - tweaked the accent color to red to match the theme */}
      <div className="w-12 h-12 border-4 border-white/10 border-t-red-500 rounded-full animate-spin"></div>
    </div>
  )
}

export default Spinner