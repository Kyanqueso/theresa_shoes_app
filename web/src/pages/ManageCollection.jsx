import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Footprints, Layers, Link as LinkIcon, Shapes, Triangle, Waves } from 'lucide-react'
import ConfirmButton from '../components/ConfirmButton.jsx'
import ShoeManager from '../components/manage/ShoeManager.jsx'
import AttributeManager from '../components/manage/AttributeManager.jsx'
import MaterialManager from '../components/manage/MaterialManager.jsx'
import BuckleManager from '../components/manage/BuckleManager.jsx'
import SlingbackFlatformManager from '../components/manage/SlingbackFlatformManager.jsx'

const TABS = [
  { key: 'shoes', label: 'Shoes', icon: Footprints },
  { key: 'materials', label: 'Materials', icon: Layers },
  { key: 'moldTypes', label: 'Mold Types', icon: Shapes },
  { key: 'heelTypes', label: 'Heel Types', icon: Triangle },
  { key: 'buckles', label: 'Buckles', icon: LinkIcon },
  { key: 'slingback', label: 'Slingback and Flatform', icon: Waves },
]

export default function ManageCollection() {
  const { tag } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('shoes')

  return (
    <>
      <section className="bg-black py-10 text-center">
        <h1 className="font-serif-display text-3xl font-bold uppercase tracking-[0.15em] text-white sm:text-4xl">
          Manage Mode
        </h1>
      </section>

      <section className="bg-accent px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-black">Manage Collections</h2>
            <ConfirmButton
              label="Exit Management"
              icon={ArrowRight}
              question="Do you want to exit manage mode?"
              onConfirm={() => navigate(`/collection/${tag}`)}
              triggerClassName="flex items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:self-auto"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-black text-white'
                    : 'border border-gray-300 text-gray-600 hover:text-black'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === 'shoes' && <ShoeManager />}
            {activeTab === 'materials' && <MaterialManager />}
            {activeTab === 'moldTypes' && (
              <AttributeManager
                category="mold_type"
                icon={Shapes}
                label="Mold Types"
                itemLabel="Mold Type"
                addLabel="Add New Mold Type"
                searchPlaceholder="Search Mold Type"
              />
            )}
            {activeTab === 'heelTypes' && (
              <AttributeManager
                category="heel_type"
                icon={Triangle}
                label="Heel Types"
                itemLabel="Heel Type"
                addLabel="Add New Heel Type"
                searchPlaceholder="Search Heel Type"
              />
            )}
            {activeTab === 'buckles' && <BuckleManager />}
            {activeTab === 'slingback' && <SlingbackFlatformManager />}
          </div>
        </div>
      </section>
    </>
  )
}
