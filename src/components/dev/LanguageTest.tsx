import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardHeader, Divider } from '@nextui-org/react'

const LanguageTest: React.FC = () => {
  const { t, i18n } = useTranslation()

  return (
    <Card className='max-w-[400px]'>
      <CardHeader className='flex gap-3'>
        <div className='flex flex-col'>
          <p className='text-md'>Language System Test</p>
          <p className='text-small text-default-500'>Current Language: {i18n.language}</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <p>
          Translated Text (common.save): <strong>{t('common.save')}</strong>
        </p>
        <p>
          Translated Text (config.general.label): <strong>{t('config.general.label')}</strong>
        </p>
      </CardBody>
    </Card>
  )
}

export default LanguageTest
