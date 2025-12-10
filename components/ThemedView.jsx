import { useColorScheme, View } from 'react-native'
import { Colors } from '../constants/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const ThemedView = ({ style, safe = false, ...props }) => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  if (!safe) return (
    <View
      style={[{ backgroundColor: theme.background }, style]}
      {...props}
    />
  )

  const insets = useSafeAreaInsets()

  return (
    <View 
      style={[{ 
        backgroundColor: theme.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingBottom: insets.bottom === 0 ? 0 : insets.bottom - 5
      }, style]} 
      {...props}
    />
  )

  
}

export default ThemedView