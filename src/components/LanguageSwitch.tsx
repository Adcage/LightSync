import React from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@nextui-org/react'

const LanguageSwitch: React.FC = () => {
  const { language, setLanguage } = useLanguage()

  const languages = [
    { key: 'en', label: 'English' },
    { key: 'zh_cn', label: '简体中文' },
    // Add other languages here
  ]

  const selectedLanguage = languages.find(lang => lang.key === language)?.label || 'Select Language'

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant='bordered'>{selectedLanguage}</Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label='Select Language'
        selectionMode='single'
        selectedKeys={new Set([language])}
        onSelectionChange={keys => {
          const newLang = Array.from(keys)[0] as string
          setLanguage(newLang)
        }}
      >
        {languages.map(lang => (
          <DropdownItem key={lang.key}>{lang.label}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}

export default LanguageSwitch
