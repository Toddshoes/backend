'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { FaEdit, FaCheck } from 'react-icons/fa'
import AdminLayout from '@/components/AdminLayout'
import { useRouter } from 'next/navigation'

const ConvenienceFeePanel = ({ loginInfo, initialFeeData }) => {
  const [convenienceFee, setConvenienceFee] = useState(initialFeeData || null)
  const [isEditing, setIsEditing] = useState(false)
  const [newFeeValue, setNewFeeValue] = useState(initialFeeData?.value || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [userData, setUserData] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // Load user data from localStorage as fallback
    setUserData(JSON.parse(localStorage.getItem('ooowap-user')))

    // If no initial data was provided, fetch it
    if (!initialFeeData) {
      fetchConvenienceFee()
    }
  }, [initialFeeData])

  // Function to fetch the current convenience fee
  const fetchConvenienceFee = async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to get auth token from both sources
      const token = loginInfo?.user?.token || userData?.token
      const config = token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : {}

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/convenience-fee`,
        config,
      )

      setConvenienceFee(response.data)
      setNewFeeValue(response.data.value)
    } catch (error) {
      console.error('Error fetching convenience fee:', error)
      setError('Failed to load convenience fee. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Function to update the convenience fee
  const updateConvenienceFee = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccessMessage(null)

      // Try to get auth token from both sources
      const token = loginInfo?.user?.token || userData?.token
      const config = token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : {}

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/convenience-fee`,
        {
          value: parseFloat(newFeeValue),
        },
        config,
      )

      // Update the local state with the new value
      setConvenienceFee({
        ...convenienceFee,
        value: parseFloat(newFeeValue),
        updatedAt: new Date().toISOString(),
      })

      setSuccessMessage('Convenience fee updated successfully!')
      setIsEditing(false)
      router.refresh() // Refresh the server component
    } catch (error) {
      console.error('Error updating convenience fee:', error)
      setError('Failed to update convenience fee. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateConvenienceFee()
  }

  return (
    <AdminLayout>
      <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">
          Website Convenience Fee Management
        </h2>

        {loading && <p className="text-gray-600">Loading...</p>}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        {convenienceFee && !isEditing && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">
                  Current Convenience Fee
                </h3>
                <p className="text-3xl font-bold text-[#C79B44] mt-2">
                  {convenienceFee.value}%
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Last updated:{' '}
                  {new Date(convenienceFee.updatedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#D5B868] text-white py-2 px-4 rounded-md flex items-center space-x-2"
              >
                <FaEdit />
                <span>Edit Fee</span>
              </button>
            </div>
          </div>
        )}

        {isEditing && (
          <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              Update Convenience Fee
            </h3>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="feeValue">
                Fee Percentage (%)
              </label>
              <input
                id="feeValue"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={newFeeValue}
                onChange={(e) => setNewFeeValue(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                Enter a value between 0 and 100
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white py-2 px-4 rounded-md flex items-center space-x-2"
              >
                <FaCheck />
                <span>{loading ? 'Updating...' : 'Save Changes'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setNewFeeValue(convenienceFee.value)
                  setError(null)
                }}
                className="bg-gray-500 text-white py-2 px-4 rounded-md"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <h3 className="text-lg font-semibold text-blue-800">
            About Convenience Fees
          </h3>
          <p className="text-blue-700 mt-2">
            The convenience fee is applied to all transactions on the platform.
            Changes to this fee will affect all future transactions immediately
            after saving.
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ConvenienceFeePanel
